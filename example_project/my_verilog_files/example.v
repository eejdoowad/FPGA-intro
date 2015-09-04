
// Note that module name 'example' matches the top level entity in the heirarchy
// Will fail otherwise
// The top level entity is the module that will be loaded into your FPGA
// The names you give its inputs and outputs should correspond to the
// names given in the pin assignment file

// Also, it's normal for compilation to take forever.

module example(SW, LEDR);

	// Allows for designing components of arbitrary width
   parameter LEDR_SIZE = 10;

	// declare inputs and outputs
   input [LEDR_SIZE - 1 : 0] SW;
	output [LEDR_SIZE - 1 : 0] LEDR;
 
	// DON'T FORGET ASSIGN 
	// ~ is Verilog's built-in bitwise negation operator
	assign LEDR[3 : 0] = ~SW[3 : 0];

	// Using our own modules we define in this file and more_stuff.v
	// Both files have to be added to the project, or compilation will fail
	my_and bobert(SW[4], SW[5], LEDR[4]);
	my_xor thefrog(SW[5], SW[6], LEDR[5]);
	inverter issad(SW[6], LEDR[6]);

	// Multibit constant assignment. Again, don't forget assign.
	assign LEDR[9 : 7] = 3'b101;

// End of module, no semicolon needed	 
endmodule


// You can have multiple modules in a single file
module inverter(in, out);

	input in;
	output out;
	// Built in not-gate primitive
	not(out, in);
 
endmodule

