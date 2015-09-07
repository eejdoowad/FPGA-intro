transcript on
if {[file exists rtl_work]} {
	vdel -lib rtl_work -all
}
vlib rtl_work
vmap work rtl_work

vlog -vlog01compat -work work +incdir+C:/Users/eejdo_000/Documents/Git/FPGA\ Intro/example_project/my_verilog_files {C:/Users/eejdo_000/Documents/Git/FPGA Intro/example_project/my_verilog_files/example.v}
vlog -vlog01compat -work work +incdir+C:/Users/eejdo_000/Documents/Git/FPGA\ Intro/example_project/my_verilog_files {C:/Users/eejdo_000/Documents/Git/FPGA Intro/example_project/my_verilog_files/more_stuff.v}

vlog -vlog01compat -work work +incdir+C:/Users/eejdo_000/Documents/Git/FPGA\ Intro/example_project {C:/Users/eejdo_000/Documents/Git/FPGA Intro/example_project/xor_testbench.v}

vsim -t 1ps -L altera_ver -L lpm_ver -L sgate_ver -L altera_mf_ver -L altera_lnsim_ver -L cycloneii_ver -L rtl_work -L work -voptargs="+acc"  xor_testbench

add wave *
view structure
view signals
run -all
